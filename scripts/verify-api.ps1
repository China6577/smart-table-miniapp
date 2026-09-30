# 端到端 API 验证脚本（Docker Compose 环境）
$ErrorActionPreference = 'Stop'
$base = 'http://localhost:3100/api'

Write-Host '=== 1. 管理端登录 ==='
$login = Invoke-RestMethod -Method Post -Uri "$base/admin/auth/login" -ContentType 'application/json' -Body (@{ username = 'admin'; password = '123456' } | ConvertTo-Json)
$login | ConvertTo-Json -Depth 5
$token = $login.data.token
$auth = @{ Authorization = "Bearer $token" }

Write-Host "`n=== 2. Dashboard 汇总 ==="
$summary = Invoke-RestMethod -Method Get -Uri "$base/admin/dashboard/summary" -Headers $auth
$summary | ConvertTo-Json -Depth 5

Write-Host "`n=== 3. 顾客端菜单（前2条）==="
$dishes = @((Invoke-RestMethod -Method Get -Uri "$base/customer/dishes?tableCode=A01").data)
"总数: $($dishes.Count)"
$dishes | Select-Object -First 2 | ForEach-Object { "{0}  {1}  ¥{2}  {3}" -f $_.id, $_.name, $_.price, $_.status }

Write-Host "`n=== 4. 顾客提交订单 ==="
$orderBody = @{
  tableCode  = 'A01'
  items      = @(
    @{ dishId = $dishes[0].id; count = 2 },
    @{ dishId = $dishes[1].id; count = 1 }
  )
  note       = '少辣'
  clientToken = "verify-$([guid]::NewGuid().ToString('N').Substring(0,8))"
} | ConvertTo-Json -Depth 5
$order = Invoke-RestMethod -Method Post -Uri "$base/customer/orders" -ContentType 'application/json' -Body $orderBody
$order | ConvertTo-Json -Depth 8
$orderNo = $order.data.orderNo

Write-Host "`n=== 5. 商家接单 ==="
$accept = Invoke-RestMethod -Method Post -Uri "$base/admin/orders/$orderNo/accept" -Headers $auth
"订单 $orderNo 状态: $($accept.data.status)"

Write-Host "`n=== 6. 状态流转: cooking -> finished ==="
foreach ($step in 'start', 'finish') {
  $r = Invoke-RestMethod -Method Post -Uri "$base/admin/orders/$orderNo/$step" -Headers $auth
  "订单 $orderNo -> $($r.data.status)"
}

Write-Host "`n=== 7. 管理端订单列表（待接单）==="
$list = Invoke-RestMethod -Method Get -Uri "$base/admin/orders?status=PENDING&page=1&pageSize=5" -Headers $auth
"待接单订单数: $($list.data.total)"
$list.data.items | Select-Object -First 2 | ConvertTo-Json -Depth 4

Write-Host "`n=== 8. 统计接口抽查 ==="
$today = (Get-Date).ToString('yyyy-MM-dd')
$from = (Get-Date).AddDays(-6).ToString('yyyy-MM-dd')
foreach ($ep in "stats/sales-trend?from=$from&to=$today", "stats/dish-ranking?from=$from&to=$today&limit=5", "stats/hourly?date=$today", "stats/category-share?from=$from&to=$today") {
  $r = Invoke-RestMethod -Method Get -Uri "$base/admin/$ep" -Headers $auth
  "OK  $ep  (code=$($r.code))"
}

Write-Host "`n=== 9. 健康检查 ==="
$health = Invoke-RestMethod -Method Get -Uri "$base/health"
"health status: $($health.data.status)  db: $($health.data.db)  uptime: $($health.data.uptime)s"

Write-Host "`n=== 10. 新统计维度抽查（Phase 5）==="
$overview = Invoke-RestMethod -Method Get -Uri "$base/admin/stats/overview?from=$from&to=$today" -Headers $auth
"overview: 营业额 $($overview.data.revenue) 元 / 订单 $($overview.data.orderCount) 单 / 环比 $($overview.data.revenueGrowth)%"
$tables = Invoke-RestMethod -Method Get -Uri "$base/admin/stats/table-overview?from=$from&to=$today&limit=5" -Headers $auth
"table-overview: 翻台率 $($tables.data.turnoverRate) / 桌均 $($tables.data.avgTableAmount) 元 / 使用 $($tables.data.usedTables)/$($tables.data.totalTables) 桌"
"table top1: $($tables.data.topTables[0].tableCode)（$($tables.data.topTables[0].area)）营业额 $($tables.data.topTables[0].revenue) 元"
$hourlyRange = Invoke-RestMethod -Method Get -Uri "$base/admin/stats/hourly?from=$from&to=$today" -Headers $auth
"hourly(range): $($hourlyRange.data.Count) 个小时点位（区间日均）"

Write-Host "`n=== 全部验证通过 ==="

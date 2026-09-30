/** 金额转换：数据库以「分」存储，接口以「元」输出（两位小数以内） */

export function fenToYuan(fen: number): number {
  return Math.round(fen) / 100
}

export function yuanToFen(yuan: number): number {
  return Math.round(yuan * 100)
}

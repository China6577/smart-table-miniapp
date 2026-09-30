/** 模拟网络延迟，让 Mock 数据的加载节奏接近真实接口 */
export function delay(ms = 300): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

const memory = new Map<string, Promise<unknown>>();

/** 读取 public/data 下的 JSON；同一文件只请求一次（并发调用共享同一个 Promise）。 */
export function loadData<T = any>(file: string): Promise<T> {
  let task = memory.get(file);
  if (!task) {
    const url = `${import.meta.env?.BASE_URL ?? '/'}data/${file}`;
    task = fetch(url).then((res) => {
      if (!res.ok) throw new Error(`无法加载 ${file}（HTTP ${res.status}）`);
      return res.json();
    });
    task.catch(() => memory.delete(file));
    memory.set(file, task);
  }
  return task as Promise<T>;
}

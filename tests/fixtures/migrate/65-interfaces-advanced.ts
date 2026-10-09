// Generic interfaces, method signatures and function types
interface Repository<T extends { id: number }> {
  items: Map<number, T>;
  add(item: T): void;
  find(id: number): T | undefined;
  filter(predicate: (item: T) => boolean): T[];
}

interface Product {
  id: number;
  name: string;
  price: number;
}

class MemoryRepository<T extends { id: number }> implements Repository<T> {
  items = new Map<number, T>();
  add(item: T): void {
    this.items.set(item.id, item);
  }
  find(id: number): T | undefined {
    return this.items.get(id);
  }
  filter(predicate: (item: T) => boolean): T[] {
    return [...this.items.values()].filter(predicate);
  }
}

const repo: Repository<Product> = new MemoryRepository<Product>();
repo.add({ id: 1, name: 'pen', price: 2 });
repo.add({ id: 2, name: 'book', price: 12 });
console.log(
  repo.find(2)?.name,
  repo.find(3),
  repo.filter(p => p.price > 5).map(p => p.name)
);
type Comparator<T> = (a: T, b: T) => number;
const byPrice: Comparator<Product> = (a, b) => a.price - b.price;
console.log(repo.filter(() => true).sort(byPrice)[0].name);

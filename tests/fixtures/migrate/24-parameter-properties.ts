// Constructor parameter properties
class User {
  constructor(
    public readonly id: number,
    public name: string,
    protected role: string = 'user',
    private secret?: string
  ) {}

  info(): string {
    return `${this.id}:${this.name}:${this.role}:${this.secret ?? 'none'}`;
  }
}

class Admin extends User {
  constructor(id: number, name: string) {
    super(id, name, 'admin', 'key');
  }
  roleName(): string {
    return this.role.toUpperCase();
  }
}

const u = new User(1, 'Ali');
u.name = 'Ali V.';
console.log(u.info(), new Admin(2, 'Root').info(), new Admin(3, 'X').roleName());
console.log(Object.keys(u).sort().join(','));

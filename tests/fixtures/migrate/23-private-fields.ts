// ECMAScript private fields and methods
class Account {
  #balance = 0;
  static #created = 0;

  constructor(readonly owner: string) {
    Account.#created++;
  }

  #log(action: string): string {
    return `${this.owner}: ${action} -> ${this.#balance}`;
  }

  deposit(amount: number): string {
    this.#balance += amount;
    return this.#log('deposit');
  }

  static created(): number {
    return Account.#created;
  }

  static isAccount(value: object): boolean {
    return #balance in value;
  }
}

const acc = new Account('Ali');
console.log(acc.deposit(10));
console.log(acc.deposit(5));
new Account('Vali');
console.log(Account.created(), Account.isAccount(acc), Account.isAccount({}));

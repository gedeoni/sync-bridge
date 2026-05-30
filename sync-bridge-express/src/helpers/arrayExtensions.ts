declare global {
  interface Array<T> {
    findAsync(predicate: (value: T) => Promise<boolean>): Promise<T | undefined>;
    findIndexAsync(predicate: (value: T) => Promise<boolean>): Promise<number>;
    filterAsync(predicate: (value: T) => Promise<boolean>): Promise<T[]>;
    someAsync(predicate: (value: T) => Promise<boolean>): Promise<boolean>;
    mapAsync<R>(mapper: (value: T) => Promise<R>): Promise<R[]>;
  }
}

Array.prototype.findAsync = async function <T>(predicate: (value: T) => Promise<boolean>): Promise<T | undefined> {
  for (const value of this) {
    const result = await predicate(value);
    if (result) {
      return value;
    }
  }
  return undefined;
};

Array.prototype.findIndexAsync = async function <T>(predicate: (value: T) => Promise<boolean>): Promise<number> {
  for (let i = 0; i < this.length; i++) {
    const value = this[i];
    const result = await predicate(value);
    if (result) {
      return i;
    }
  }
  return -1; // Return -1 if no element satisfying the predicate is found
};

Array.prototype.filterAsync = async function <T>(predicate: (value: T) => Promise<boolean>): Promise<T[]> {
  const filteredArray: T[] = [];
  for (const value of this) {
    const result = await predicate(value);
    if (result) {
      filteredArray.push(value);
    }
  }
  return filteredArray;
};

Array.prototype.someAsync = async function <T>(predicate: (value: T) => Promise<boolean>): Promise<boolean> {
  for (const value of this) {
    const result = await predicate(value);
    if (result) {
      return true;
    }
  }
  return false;
};

Array.prototype.mapAsync = async function <T, R>(mapper: (value: T) => Promise<R>): Promise<R[]> {
  const mappedArray: R[] = [];
  for (const value of this) {
    const mappedValue = await mapper(value);
    mappedArray.push(mappedValue);
  }
  return mappedArray;
};

export {};

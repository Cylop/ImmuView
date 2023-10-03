class DirectMutationError extends Error {}


type ReadonlyState<T> = {
    value: T;
    internalSet: (newValue: T) => void;
};

const createProxy = <T extends object>(initialValue: T): ReadonlyState<T> => {
    let value = initialValue;

    const proxy = new Proxy({} as T, {
        get: (_, property) => {
          return value[property as keyof T];
        },
        set: (target, property, value) => {
          throw new DirectMutationError(
            `This state is read-only. Tried to modify property directly with '${String(target)}.${String(
              property,
            )} = ${String(value)}'.
                    Use the internalSet function to modify the state`,
          );
        },
        ownKeys: () => {
          return Reflect.ownKeys(value);
        },
        has: (_target, key) => {
          return key in value;
        },
        getOwnPropertyDescriptor: (_target, key) => {
          return Reflect.getOwnPropertyDescriptor(value, key);
        },
      });

    const internalSet = (newValue: T) => {
        value = newValue;
    };

    return { value: proxy, internalSet };
}

const createPrimitive = <T>(initialValue: T): ReadonlyState<T> =>  {
    let value = initialValue;

    const getValue = () => value;
    const internalSet = (newValue: T) => {
        value = newValue;
    };

    return { value: getValue(), internalSet };
}

const readonly = <T>(initialValue: T): ReadonlyState<T> => {
    if (typeof initialValue === 'object' && initialValue !== null) {
        return createProxy(initialValue as any);
    } else {
        return createPrimitive(initialValue);
    }
}

export { readonly, DirectMutationError };
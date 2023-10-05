class DirectMutationError extends Error {}
class ValidationError extends Error {}

type ErrorHandler = (error: Error) => void;
type ReadonlyState<T> = {
    value: T;
    internalSet: (newValue: T) => void;
};
type Validator<T> = (value: T) => boolean;

interface ReadonlyStateOptions<T> {
    validator?: Validator<T>;
    errorHandler?: ErrorHandler;
    validationErrorMessage?: string;
}

const DATE_MUTATING_METHODS = [
    'setDate',
    'setFullYear',
    'setHours',
    'setMilliseconds',
    'setMinutes',
    'setMonth',
    'setSeconds',
    'setTime',
    'setUTCDate',
    'setUTCDay',
    'setUTCFullYear',
    'setUTCHours',
    'setUTCMilliseconds',
    'setUTCMinutes',
    'setUTCMonth',
    'setUTCSeconds',
];

const ARRAY_MUTATING_METHODS = [
    'push',
    'pop',
    'shift',
    'unshift',
    'splice',
    'reverse',
    'sort',
];

const isObject = (value: any): value is object =>
    typeof value === 'object' && value !== null;

const deepMerge = (target: any, source: any) => {
    for (const key in source) {
        if (Array.isArray(source[key])) {
            target[key] = [...source[key]];
        } else if (isObject(source[key])) {
            if (!target[key]) target[key] = {};
            deepMerge(target[key], source[key]);
        } else {
            target[key] = source[key];
        }
    }
};

const throwError = () => {
    throw new DirectMutationError('Cannot modify readonly state.');
};

const dateProxyHandler: ProxyHandler<Date> = {
    get: (dateObj, dateProp, receiver) => {
        if (DATE_MUTATING_METHODS.includes(String(dateProp))) {
            return throwError;
        }
        // need to bind the function to the date object to avoid errors when calling it from the proxy
        const value = Reflect.get(dateObj, dateProp, receiver);
        if (typeof value === 'function') {
            return value.bind(dateObj);
        }
        return value;
    },
};

const arrayProxyHandler: ProxyHandler<any[]> = {
    get: (arr, arrProp) => {
        if (ARRAY_MUTATING_METHODS.includes(String(arrProp))) {
            return throwError;
        }
        const item = arr[arrProp as any];
        if (isObject(item)) {
            return createDeepProxy(item);
        }
        return item;
    },
};

const createHandler = <T>(
    target: T,
    proxies: WeakMap<object, any>,
    options?: ReadonlyStateOptions<T> | undefined,
): ProxyHandler<T & { [key: string]: any }> => {
    Object.preventExtensions(target);
    return {
        get: (obj, prop: string | symbol) => {
            const value = obj[prop as keyof T];
            if ((value as any) instanceof Date) {
                return new Proxy(value, dateProxyHandler);
            } else if (
                Array.isArray(value) ||
                (Array.isArray(obj) && typeof value === 'function')
            ) {
                return new Proxy(value, arrayProxyHandler);
            } else if (isObject(value)) {
                return createDeepProxy(value, options, proxies);
            } else if (typeof value === 'function') {
                return value.bind(obj);
            }
            return value;
        },
        set: throwError,
        deleteProperty: throwError,
        defineProperty: throwError,
        setPrototypeOf: throwError,
        preventExtensions: throwError,
        ownKeys: (obj) => {
            return Reflect.ownKeys(obj);
        },
        has: (target, key) => {
            return key in target;
        },
        getOwnPropertyDescriptor: (target, key) => {
            return Reflect.getOwnPropertyDescriptor(target, key);
        },
        isExtensible: (target) => {
            return Object.isExtensible(target);
        },
        getPrototypeOf: (target) => {
            return Reflect.getPrototypeOf(target);
        },
        apply: () => {
            throw new DirectMutationError('Cannot modify readonly state.');
        },
    };
};

const createDeepProxy = <T>(
    target: T,
    options?: ReadonlyStateOptions<T>,
    proxies: WeakMap<object, any> = new WeakMap(),
): T => {
    let proxyKey = {};
    if (!isObject(target)) {
        proxyKey = { value: target };
    } else {
        proxyKey = target;
    }

    if (proxies.has(proxyKey)) {
        return proxies.get(proxyKey);
    }

    const handler: ProxyHandler<T & { [key: string]: any }> = createHandler<T>(
        target,
        proxies,
        options,
    );

    const proxy = new Proxy(proxyKey, handler);
    proxies.set(proxyKey, proxy);
    return proxy as T;
};

const readonly = <T>(
    initialValue: T,
    options?: ReadonlyStateOptions<T>,
): ReadonlyState<T> => {
    let proxy = createDeepProxy(initialValue, options);
    const internalSet = (newValue: T) => {
        if (options?.validator && !options.validator(newValue)) {
            const error = new ValidationError(
                options.validationErrorMessage ?? 'Validation failed.',
            );
            if (options?.errorHandler) {
                options.errorHandler(error);
                return;
            }
            throw error;
        }
        deepMerge(initialValue, newValue);
        proxy = createDeepProxy(initialValue, options);
    };

    return { value: proxy, internalSet };
};

export {
    readonly,
    DirectMutationError,
    ValidationError,
    ErrorHandler,
    ReadonlyState,
    Validator,
    ReadonlyStateOptions,
    arrayProxyHandler,
    dateProxyHandler,
    createHandler,
    createDeepProxy,
    isObject,
    deepMerge,
};

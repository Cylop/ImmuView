class DirectMutationError extends Error {}
class ValidationError extends Error {}

type ErrorHandler = (error: Error) => void;

type ReadonlyState<T> = {
    value: Readonly<T>;
    internalSet: (newValue: T) => void;
};

type Validator<T> = (value: T) => boolean;

interface ReadonlyStateOptions<T> {
    validator?: Validator<T>;
    errorHandler?: ErrorHandler;
    validationErrorMessage?: string;
}

const defaultErrorHandler = (error: Error) => {
    console.error(error.message);
};

const isObject = (value: any): value is object =>
    typeof value === 'object' && value !== null;

const createInternalSet = <T>(
    valueRef: { current: T },
    validator?: Validator<T>,
    errorHandler: ErrorHandler = defaultErrorHandler,
    validationErrorMessage?: string
) => {
    return (newValue: T) => {
        if (validator && !validator(newValue)) {
            errorHandler(
                new ValidationError(
                    validationErrorMessage || 'Validation failed.'
                )
            );
            return;
        }
        valueRef.current = newValue;
    };
};

const objectHandler = <T extends object>(valueRef: {
    current: T;
}): ProxyHandler<T> => ({
    get: (_target, property) => {
        const propValue = valueRef.current[property as keyof T];
        if (isObject(propValue)) {
            return new Proxy(propValue, objectHandler({ current: propValue }));
        }
        return propValue;
    },
    set: (_target, property, _newValue) => {
        throw new DirectMutationError(
            `Cannot modify readonly state property '${String(property)}'.`
        );
    },
});

const createProxy = <T extends object>(
    initialValue: T,
    options?: ReadonlyStateOptions<T>
): ReadonlyState<T> => {
    const valueRef = { current: initialValue };
    const { validator, errorHandler, validationErrorMessage } = options || {};

    const proxy = new Proxy({} as T, objectHandler(valueRef));

    const internalSet = createInternalSet(
        valueRef,
        validator,
        errorHandler,
        validationErrorMessage
    );

    return { value: proxy, internalSet };
};

const createPrimitive = <T>(
    initialValue: T,
    options?: ReadonlyStateOptions<T>
): ReadonlyState<T> => {
    const valueRef = { current: initialValue };
    const { validator, errorHandler, validationErrorMessage } = options || {};

    const internalSet = createInternalSet(
        valueRef,
        validator,
        errorHandler,
        validationErrorMessage
    );

    return { value: valueRef.current, internalSet };
};

const readonly = <T>(
    initialValue: T,
    options?: ReadonlyStateOptions<T>
): ReadonlyState<T> => {
    if (isObject(initialValue)) {
        return createProxy(initialValue as any, options);
    } else {
        return createPrimitive(initialValue, options);
    }
};

export { readonly, DirectMutationError, ValidationError };

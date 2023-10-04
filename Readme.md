# ImmuView 🛡️ Immutable State Management via Proxy

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Tests](https://img.shields.io/badge/tests-100%25-green)

Elegantly enforce immutability in your JavaScript and TypeScript states.

ImmuView is a lightweight utility designed to provide a readonly view of your JavaScript objects. With ImmuView, you can ensure that your state remains immutable, while still allowing controlled mutations through a dedicated API.

---

## 🌟 Special Features

### 🚀 Lazy Proxy Initialization

ImmuView doesn't just create a proxy for your object; it does so lazily. This means that nested objects within your state are only proxied when they're accessed, ensuring optimal performance and minimal overhead.

### 🌐 Supported Value Types

ImmuView supports a wide range of value types:

-   ~~Primitives~~: Numbers, Strings, Booleans - not realy supported, but you can wrap them in an object to make them work.
-   **Objects**: Plain objects, nested objects
-   **Arrays**: Including nested arrays and arrays of objects
-   **Functions**: Functions are bound to the original object, ensuring `this` behaves as expected.
-   **Dates**: Special handling ensures that you can't mutate dates through methods like `setDate` or `setFullYear`.

### 🛡️ Custom Validation and Error Handling

Want to validate your state before it's updated? ImmuView provides custom validation hooks. You can also customize the error handling behavior, making it flexible enough to fit into any application architecture.

### 📦 Seamless Integration

Whether you're working with functional components, class-based components, or just plain JavaScript, ImmuView can be easily integrated. It's framework-agnostic, so you can use it with React, Vue, Angular, or even without a framework!

## 🌟 Features

-   **Deep Immutability**: Ensure that nested objects and arrays are also immutable.
-   **Lazy Initialization**: Nested objects are only proxied when they're accessed.
-   **WeakMap Caching**: Proxies are cached using a WeakMap, ensuring optimal performance.
-   **Custom Validation**: Set custom validation rules for your state.
-   **Error Handling**: Handle errors gracefully with custom error handlers.
-   **TypeScript Support**: Fully typed for a great developer experience.

---

## 🚀 Getting Started

### Installation

To get started with ImmuView, you first need to install it:

```bash
npm install immuview --save
```

---

## 📖 Usage

Here's a quick example to get you started:

### 📖 Basic Usage

```typescript
import { readonly, DirectMutationError, ValidationError } from 'immuview';

const state = readonly({ count: 5, nested: { value: 10 } });

// This will throw a DirectMutationError
state.value.count = 10;

// This will also throw a DirectMutationError
delete (state.value.nested as any).value;
```

### 📖 Class-based Usage

For those who prefer a class-based approach, `ImmuView` can be seamlessly integrated into your classes. Here's a quick example:

```typescript
import { readonly, DirectMutationError, ValidationError } from 'immuview';

class Counter {
    private _state: ReturnType<typeof readonly>;

    constructor(initialValue: { count: number }) {
        this._state = readonly(initialValue);
    }

    // Getter to access the readonly state
    get state() {
        return this._state.value;
    }

    // Method to internally mutate the state
    increment() {
        const newValue = { count: this._state.value.count + 1 };
        this._state.internalSet(newValue);
    }

    // Another example method to internally mutate the state
    reset() {
        this._state.internalSet({ count: 0 });
    }
}

const counter = new Counter({ count: 0 });

console.log(counter.state.count); // Outputs: 0

counter.increment();
console.log(counter.state.count); // Outputs: 1

// This will throw a DirectMutationError
counter.state.count = 5;

counter.reset();
console.log(counter.state.count); // Outputs: 0
```

In the example above, the Counter class encapsulates the ImmuView logic, allowing internal mutations via methods like increment and reset, while ensuring that external direct mutations throw errors.

---

## 🛠️ Options

You can provide additional options when creating a readonly state:

```typescript
const options = {
    validator: (value) => value.count < 10,
    errorHandler: (error) => console.error(error.message),
    validationErrorMessage: 'Count should be less than 10',
};

const state = readonly({ count: 5 }, options);

// This will throw a ValidationError with the message 'Count should be less than 10'
state.internalSet({ count: 15 });
```

## 📚 API

### `readonly(initialValue, options?)`

Creates a new readonly state.

-   `initialValue`: The initial value of the state.
-   `options`: Optional configuration.
    -   `validator`: A function that returns a boolean indicating whether the state is valid or not. Defaults to `() => true`.
    -   `errorHandler`: A function that handles errors thrown by the state. Defaults to `() => {}`.
    -   `validationErrorMessage`: The error message to be thrown when the state is invalid. Defaults to ``.

### `DirectMutationError`

Error thrown when trying to mutate the state directly.

### `ValidationError`

Error thrown when the state does not pass validation.

---

## 🙌 Contributing

We welcome contributions! Please see our [contributing guidelines](CONTRIBUTING.md) for more details.

---

## 📜 License

[MIT](./LICENSE)

---

## 🌐 Links

-   [Code of Conduct](CODEOFCONDUCT.md)

---

## 🙏 Acknowledgements

Thanks to all contributors and users for making ImmuView a reality!

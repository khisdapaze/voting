import type { EventHandler, SyntheticEvent } from 'react';

const mergeEventHandlers = <T extends SyntheticEvent>(
    ...handlers: (EventHandler<T> | undefined)[]
): EventHandler<T> => {
    return (event) => {
        handlers.forEach((handler) => {
            if (typeof handler === 'function') {
                handler(event);
            }
        });
    };
};

export default mergeEventHandlers;

import { useState } from 'react';

const useControllableState = <T,>(
    initialValue?: T,
    controlledValue?: T,
    setControlledValue?: (value: T) => void
): [T, (value: T | ((prevValue: T) => T)) => void] => {
    const [state, setState] = useState<T>(initialValue!);

    const isControlled = controlledValue !== undefined;

    const stateValue = isControlled ? controlledValue : state;

    const setStateValue = (value: T | ((prevValue: T) => T)) => {
        if (!isControlled) {
            setState(value);
        }

        if (setControlledValue) {
            if (typeof value === 'function') {
                setControlledValue((value as (prevValue: T) => T)(stateValue));
            } else {
                setControlledValue(value);
            }
        }
    };

    return [stateValue, setStateValue];
};

export default useControllableState;

import classnames from './classnames.ts';
import mergeRefs from './mergeRefs.ts';
import mergeEventHandlers from './mergeEventHandlers.ts';

export type AnyProps = Record<string, any>;

const mergeProps = (slotProps: AnyProps, childProps: AnyProps) => {
    // all child props should override
    const overrideProps = { ...childProps };

    for (const propName in childProps) {
        const slotPropValue = slotProps[propName];
        const childPropValue = childProps[propName];

        const isHandler = /^on[A-Z]/.test(propName);
        if (isHandler) {
            overrideProps[propName] = mergeEventHandlers(childPropValue, slotPropValue);
        }

        // merge refs
        if (propName === 'ref') {
            overrideProps[propName] = mergeRefs(slotPropValue, childPropValue);
        }

        // if it's `style`, we merge them
        else if (propName === 'style') {
            overrideProps[propName] = { ...slotPropValue, ...childPropValue };
        } else if (propName === 'className') {
            overrideProps[propName] = classnames(slotPropValue, childPropValue);
        }
    }

    return { ...slotProps, ...overrideProps };
};

export default mergeProps;

import React from 'react';
import mergeProps, { type AnyProps } from '../utils/mergeProps.ts';

export interface Slottable {
    asChild?: true;
}

export declare const mergeRefs: (...refs: any[]) => (node: any) => void;

const Slot = <T extends { children?: any; style?: any } = React.HTMLAttributes<HTMLElement>>({
    children,
    ...props
}: T) => {
    if (React.isValidElement(children)) {
        const mergedProps = mergeProps(props, children.props as AnyProps);
        return React.cloneElement(children, mergedProps);
    }
    if (React.Children.count(children) > 1) {
        React.Children.only(null);
    }
    return null;
};

export default Slot;

import React from 'react';
import classnames from '../utils/classnames.ts';

const PageRoot = ({ className, ...props }: React.ComponentPropsWithRef<'div'>) => {
    return (
        <div
            className={classnames('flex flex-col items-center bg-white min-h-dvh select-none', className)}
            {...props}
        />
    );
};

const PageInner = ({ className, ...props }: React.ComponentPropsWithRef<'div'>) => {
    return <div className={classnames('flex flex-col min-h-full w-full max-w-[50rem]', className)} {...props} />;
};

export default Object.assign(PageRoot, {
    Inner: PageInner,
});

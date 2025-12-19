import React, { useMemo } from 'react';
import Slot from './Slot.tsx';

export type ThemeColor =
    | 'red'
    | 'orange'
    | 'amber'
    | 'yellow'
    | 'lime'
    | 'green'
    | 'emerald'
    | 'teal'
    | 'cyan'
    | 'sky'
    | 'blue'
    | 'indigo'
    | 'violet'
    | 'purple'
    | 'fuchsia'
    | 'pink'
    | 'rose'
    | 'slate'
    | 'gray'
    | 'zinc'
    | 'neutral'
    | 'stone';

export type BaseColor = 'slate' | 'gray' | 'zinc' | 'neutral' | 'stone';

export const DEFAULT_THEME_COLOR: ThemeColor = 'emerald';
export const DEFAULT_BASE_COLOR: BaseColor = 'gray';

const getThemeStyle = (themeColor: ThemeColor, baseColor: BaseColor) => {
    const shades = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

    return shades.reduce(
        (acc, shade) => ({
            ...acc,
            [`--color-theme-${shade}`]: `var(--color-${themeColor}-${shade})`,
            [`--color-base-${shade}`]: `var(--color-${baseColor}-${shade})`,
        }),
        {} as React.CSSProperties
    );
};

const Theme = ({
    children,
    theme = DEFAULT_THEME_COLOR,
    base = DEFAULT_BASE_COLOR,
}: {
    children: React.ReactNode;
    theme?: ThemeColor;
    base?: BaseColor;
}) => {
    const style = useMemo(() => getThemeStyle(theme, base), [theme, base]);

    return <Slot style={style}>{children}</Slot>;
};

export default Theme;

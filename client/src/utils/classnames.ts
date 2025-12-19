import { twMerge } from 'tailwind-merge';
import clsx from 'clsx';

export default (...classes: any[]) => twMerge(clsx(...classes));

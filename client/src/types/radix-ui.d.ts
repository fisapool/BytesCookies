import '@radix-ui/themes';

declare module '@radix-ui/themes' {
  import { ComponentProps, ForwardRefExoticComponent, RefAttributes } from 'react';

  export interface ButtonProps extends ComponentProps<'button'> {
    variant?: 'solid' | 'soft' | 'outline' | 'ghost';
    color?: 'red' | 'blue' | 'gray';
  }

  export const Button: ForwardRefExoticComponent<ButtonProps & RefAttributes<HTMLButtonElement>>;
  export const Theme: ForwardRefExoticComponent<ComponentProps<'div'> & RefAttributes<HTMLDivElement>>;
} 
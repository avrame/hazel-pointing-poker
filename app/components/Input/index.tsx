import { forwardRef, InputHTMLAttributes, LegacyRef } from "react";

interface InputProps extends InputHTMLAttributes<Element> {
  ref?: LegacyRef<HTMLInputElement>;
}

function Button(
  { type = "text", className, ...restProps }: InputProps,
  ref: LegacyRef<HTMLInputElement>,
) {
  return (
    <input
      ref={ref}
      type={type}
      className={`flex-1 rounded-md border-2 border-blue-500 px-3 text-lg leading-loose ${className}`}
      {...restProps}
    />
  );
}

export default forwardRef(Button);

import { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<Element> {
  theme?: "primary" | "secondary" | "danger";
  selected?: boolean;
}

export default function Button({
  type = "button",
  theme = "primary",
  selected,
  children,
  ...restProps
}: ButtonProps) {
  const styleClasses = (() => {
    switch (theme) {
      case "primary":
        return `bg-blue-500 ${selected ? "bg-green-400 hover:bg-green-400 disabled:hover:bg-green-400" : "hover:bg-blue-600 disabled:hover:bg-blue-500"}`;
      case "secondary":
        return `bg-gray-500 ${selected ? "bg-green-400 hover:bg-green-400 disabled:hover:bg-green-400" : "hover:bg-gray-600 disabled:hover:bg-gray-500"}`;
      case "danger":
        return `bg-red-500 ${selected ? "bg-green-400 hover:bg-green-400 disabled:hover:bg-green-400" : "hover:bg-red-600 disabled:hover:bg-red-500"}`;
    }
  })();

  const btnClasses = `rounded px-4 py-2 text-white disabled:opacity-50 disabled:cursor-not-allowed ${styleClasses}`;

  return (
    <button type={type} className={btnClasses} {...restProps}>
      {children}
    </button>
  );
}

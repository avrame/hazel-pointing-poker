import { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<Element> {
  theme?: 'primary' | 'secondary' | 'danger'
}

export default function Button({type = 'button', theme = 'primary', children, ...restProps}: ButtonProps) {
  const styleClasses = (() => {
    switch (theme) {
      case 'primary': return 'bg-blue-500 hover:bg-blue-600 focus:bg-blue-400'
      case 'secondary': return 'bg-gray-500 hover:bg-gray-600 focus:bg-gray-400'
      case 'danger': return 'bg-red-500 hover:bg-red-600 focus:bg-red-400'
    }
  })()

  const className = `rounded px-4 py-2 text-white ${styleClasses}`

  return  (
    <button type={type} className={className} {...restProps}>{children}</button>
  )
}
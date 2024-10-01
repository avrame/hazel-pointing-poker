import { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<Element> {
  theme?: 'primary' | 'secondary' | 'danger'
  selected?: boolean
}

export default function Button({type = 'button', theme = 'primary', selected, children, ...restProps}: ButtonProps) {
  const styleClasses = (() => {
    switch (theme) {
      case 'primary': return 'bg-blue-500 hover:bg-blue-600'
      case 'secondary': return 'bg-gray-500 hover:bg-gray-600'
      case 'danger': return 'bg-red-500 hover:bg-red-600'
    }
  })()

  const btnClasses = `rounded px-4 py-2 text-white ${styleClasses} ${selected ? 'bg-green-400 hover:bg-green-400' : ''}`

  return  (
    <button type={type} className={btnClasses} {...restProps}>{children}</button>
  )
}
export default function Checkbox({ name, ...restProps }: { name: string }) {
  return <input type="checkbox" name={name} {...restProps} />
}
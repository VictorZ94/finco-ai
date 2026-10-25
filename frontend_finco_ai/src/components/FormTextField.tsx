import TextField, { type TextFieldProps } from '@mui/material/TextField'
import { useController, type Control, type FieldPath, type FieldValues } from 'react-hook-form'

type FormTextFieldProps<TValues extends FieldValues, TOutput> = Omit<
  TextFieldProps,
  'name' | 'value' | 'defaultValue' | 'onChange' | 'onBlur' | 'inputRef' | 'error'
> & {
  control: Control<TValues, unknown, TOutput>
  name: FieldPath<TValues>
}

/**
 * A MUI TextField bound to a react-hook-form field. It is controlled on purpose: with the
 * React Compiler, `register()` props are memoized, so after `reset(values)` an uncontrolled
 * input never gets its ref re-attached and keeps showing the old text.
 */
export default function FormTextField<TValues extends FieldValues, TOutput = TValues>({
  control,
  name,
  helperText,
  ...props
}: FormTextFieldProps<TValues, TOutput>) {
  const { field, fieldState } = useController({ control, name })
  return (
    <TextField
      {...props}
      name={field.name}
      value={field.value ?? ''}
      onChange={field.onChange}
      onBlur={field.onBlur}
      inputRef={field.ref}
      error={fieldState.invalid}
      helperText={fieldState.error?.message ?? helperText}
    />
  )
}

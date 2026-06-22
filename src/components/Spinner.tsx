import { ActivityIndicator } from 'react-native'

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
}

const sizeMap: Record<'sm' | 'md' | 'lg', 'small' | 'large'> = {
  sm: 'small',
  md: 'small',
  lg: 'large',
}

export function Spinner({ size = 'md' }: SpinnerProps) {
  return (
    <ActivityIndicator
      size={sizeMap[size]}
      className="text-accent dark:text-accent-dark"
      accessibilityLabel="Loading"
    />
  )
}

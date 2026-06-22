import { Modal as RNModal, View, Text, Pressable, ScrollView } from 'react-native'
import { X } from 'lucide-react-native'
import type { ReactNode } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  /** Pinned footer (e.g. action buttons). Stays visible while the body scrolls. */
  footer?: ReactNode
  /** 'default' = standard width. 'large' = wider for complex forms. */
  size?: 'default' | 'large'
}

export function Modal({ open, onClose, title, children, footer, size = 'default' }: ModalProps) {
  return (
    <RNModal
      visible={open}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Dim overlay */}
      <Pressable
        className="flex-1 bg-overlay dark:bg-overlay-dark items-center justify-center p-4"
        onPress={onClose}
      >
        {/* Dialog panel — stop touches propagating to the overlay */}
        <Pressable
          className={`bg-bg dark:bg-bg-dark rounded-2xl border border-border dark:border-border-dark w-full ${size === 'large' ? 'max-w-2xl' : 'max-w-md'} overflow-hidden`}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <View className="flex-row items-center justify-between px-4 pt-4 pb-2">
            {title ? (
              <Text className="text-lg font-semibold text-app-text dark:text-text-dark flex-1 mr-2">
                {title}
              </Text>
            ) : <View className="flex-1" />}
            <Pressable
              onPress={onClose}
              className="w-8 h-8 items-center justify-center rounded-full bg-surface dark:bg-surface-dark active:opacity-70"
              accessibilityLabel="Close"
            >
              <X size={18} className="text-app-text dark:text-text-dark" />
            </Pressable>
          </View>

          {/* Scrollable body */}
          <ScrollView
            className="px-4"
            contentContainerClassName="pb-4"
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>

          {/* Pinned footer */}
          {footer && (
            <View className="px-4 pb-4 pt-2 border-t border-border dark:border-border-dark">
              {footer}
            </View>
          )}
        </Pressable>
      </Pressable>
    </RNModal>
  )
}

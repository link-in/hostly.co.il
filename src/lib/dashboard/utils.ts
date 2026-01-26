export const formatDate = (value?: string) => {
  if (!value) {
    return '—'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('he-IL', { dateStyle: 'medium' }).format(date)
}

export const formatCurrency = (value: number) =>
  new Intl.NumberFormat('he-IL', { 
    style: 'currency', 
    currency: 'ILS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)

export const formatStatus = (status: string) => {
  switch (status) {
    case 'confirmed':
      return 'מאושר'
    case 'pending':
      return 'ממתין'
    case 'cancelled':
      return 'בוטל'
    default:
      return status
  }
}

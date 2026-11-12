export interface StaffMember {
  id: string
  country: string
  code: string
  flag: string
  phone: string
  cleanPhone: string
  display: string
  role: string
}

export const STAFF_MEMBERS: StaffMember[] = [
  {
    id: 'belgique',
    country: 'Belgique',
    code: '+32',
    flag: '🇧🇪',
    phone: '+32465690596',
    cleanPhone: '32465690596',
    display: '+32 465 69 05 96',
    role: 'Staff Référent Belgique',
  },
  {
    id: 'allemagne',
    country: 'Allemagne',
    code: '+49',
    flag: '🇩🇪',
    phone: '+491632613118',
    cleanPhone: '491632613118',
    display: '+49 163 261 31 18',
    role: 'Staff Référent Allemagne',
  },
  {
    id: 'france',
    country: 'France / International',
    code: '+33',
    flag: '🇫🇷',
    phone: '+33753304120',
    cleanPhone: '33753304120',
    display: '+33 7 53 30 41 20',
    role: 'Staff France & International',
  },
]

export function getStaffForCountryCode(dialCode: string): StaffMember {
  if (dialCode === '+32') return STAFF_MEMBERS[0] // Belgique
  if (dialCode === '+49') return STAFF_MEMBERS[1] // Allemagne
  return STAFF_MEMBERS[2] // France & International
}

export function detectCountryFromPhone(phone?: string | null): { flag: string; country: string } {
  if (!phone) return { flag: '🌍', country: 'Non renseigné' }
  const clean = phone.replace(/\D/g, '')
  if (clean.startsWith('32')) return { flag: '🇧🇪', country: 'Belgique' }
  if (clean.startsWith('49')) return { flag: '🇩🇪', country: 'Allemagne' }
  if (clean.startsWith('33')) return { flag: '🇫🇷', country: 'France' }
  if (clean.startsWith('237')) return { flag: '🇨🇲', country: 'Cameroun' }
  if (clean.startsWith('41')) return { flag: '🇨🇭', country: 'Suisse' }
  if (clean.startsWith('44')) return { flag: '🇬🇧', country: 'UK' }
  if (clean.startsWith('1')) return { flag: '🇺🇸', country: 'USA/Canada' }
  return { flag: '🌍', country: 'International' }
}

import bcrypt from 'bcryptjs'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

const SALT_ROUNDS = 12

type CustomerRecord = {
  passwordHash: string
  createdAt: string
}

type CustomerStore = {
  customers: Record<string, CustomerRecord>
}

function getStorePath() {
  return import.meta.env.CUSTOMER_DATA_PATH || join(process.cwd(), 'data', 'customers.json')
}

function readStore(): CustomerStore {
  const path = getStorePath()
  if (!existsSync(path)) return { customers: {} }

  try {
    const parsed = JSON.parse(readFileSync(path, 'utf8')) as CustomerStore
    return { customers: parsed.customers ?? {} }
  } catch {
    return { customers: {} }
  }
}

function writeStore(store: CustomerStore) {
  const path = getStorePath()
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, JSON.stringify(store, null, 2), 'utf8')
}

export function hasCustomerAccount(email: string) {
  const normalized = email.trim().toLowerCase()
  return Boolean(readStore().customers[normalized]?.passwordHash)
}

export async function createCustomerAccount(email: string, password: string) {
  const normalized = email.trim().toLowerCase()
  const store = readStore()

  if (store.customers[normalized]?.passwordHash) {
    throw new Error('Account already exists')
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS)
  store.customers[normalized] = {
    passwordHash,
    createdAt: new Date().toISOString(),
  }

  writeStore(store)
}

export async function verifyCustomerPassword(email: string, password: string) {
  const normalized = email.trim().toLowerCase()
  const record = readStore().customers[normalized]
  if (!record?.passwordHash) return false
  return bcrypt.compare(password, record.passwordHash)
}

import { createFileRoute } from '@tanstack/react-router'
import { IndexPage } from '../pages/IndexPage'
import '../styles.css'

export const Route = createFileRoute('/')({ component: IndexPage })

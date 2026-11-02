import { createFileRoute } from '@tanstack/react-router'
import { HomePage } from '../pages/HomePage'
import '../styles.css'

export const Route = createFileRoute('/homes/$homeId')({ component: HomePage })

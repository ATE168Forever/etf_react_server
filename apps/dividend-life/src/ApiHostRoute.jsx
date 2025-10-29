import { API_HOST } from './config.js'
import styles from './ApiHostRoute.module.css'

export default function ApiHostRoute() {
  return (
    <main className={styles.container}>
      <h1 className={styles.title}>API Host</h1>
      <code className={styles.value}>{API_HOST || '(empty)'}</code>
    </main>
  )
}

import styles from './MainPage.module.scss'
import Button from '../../atoms/Button/Button.tsx'
import { useNavigate } from 'react-router-dom'
import Typography from '../../atoms/Typography/Typography.tsx'

const MainPage = () => {
    const navigate = useNavigate()
    return (
        <div className={styles.wrapper}>
            <div className={styles.content}>
                <Button onClick={() => navigate('/operator')}>
                    <Typography dType="r20">ВОЙТИ КАК ОПЕРАТОР</Typography>
                </Button>
                <Button onClick={() => navigate('/user')}>
                    <Typography dType="r20">ВОЙТИ КАК ПОЛЬЗОВАТЕЛЬ</Typography>
                </Button>
            </div>
        </div>
    )
}

export default MainPage

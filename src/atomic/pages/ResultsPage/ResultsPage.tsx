import styles from './ResultsPage.module.scss';
import Typography from '../../atoms/Typography/Typography.tsx';
import { personalInfo } from '../../../mockedData/mockedData.ts';
import Button from '../../atoms/Button/Button.tsx';
import { useNavigate } from 'react-router-dom';

interface ResultsPageProps {
    onBack?: () => void; // Новый пропс для возврата
}

const ResultsPage = ({ onBack }: ResultsPageProps) => {
    const navigate = useNavigate();
    
    return (
        <div className={styles.wrapper}>
            <div className={styles.mainInfo}>ИНФОРМАЦИЯ О ЗВОНКЕ</div>
            <div className={styles.info}>
                <Typography dType="r20">{personalInfo}</Typography>
            </div>
            
            {/* Добавляем кнопки для навигации */}
            <div className={styles.buttons}>
                {onBack && (
                    <Button onClick={onBack}>
                        <Typography dType="r24">Вернуться к оператору</Typography>
                    </Button>
                )}
                <Button onClick={() => navigate('/')}>
                    <Typography dType="r24">На главную</Typography>
                </Button>
            </div>
        </div>
    );
};

export default ResultsPage;
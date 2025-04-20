import { useState } from 'react';
import styles from './OperatorPage.module.scss';
import { hints, personalInfo } from '../../../mockedData/mockedData.ts';
import Button from '../../atoms/Button/Button.tsx';
import Typography from '../../atoms/Typography/Typography.tsx';
import { useNavigate } from 'react-router-dom';
import Hint from '../../atoms/Hint/Hint.tsx';
import { useWebSocketAudio } from '../useWebSocketAudio';
import ResultsPage from '../ResultsPage/ResultsPage';

const OperatorPage = () => {
    const navigate = useNavigate();
    const { callStatus, endCall } = useWebSocketAudio('ws://localhost:8000/ws/operator', 'operator');
    const [showResults, setShowResults] = useState(false);

    const handleEndCall = () => {
        endCall();
        setShowResults(true);
    };

    const handleBackToOperator = () => {
        setShowResults(false);
    };

    return (
        <div className={styles.wrapper}>
            {/* Основной интерфейс оператора */}
            {!showResults && (
                <>
                    <div className={styles.left}>
                        <div className={styles.leftContent}>
                            {hints.map((hint, index) => (
                                <Hint text={hint.text} type={hint.type} key={index} />
                            ))}
                        </div>
                    </div>
                    <div className={styles.right}>
                        <div className={styles.mainInfo}>
                            {callStatus === 'connected' 
                                ? 'РАЗГОВОР С КЛИЕНТОМ' 
                                : 'ОЖИДАНИЕ КЛИЕНТА'}
                        </div>
                        <div className={styles.info}>
                            <Typography dType="r20">{personalInfo}</Typography>
                        </div>
                        <Button onClick={handleEndCall}>
                            <Typography dType="r24">
                                {callStatus === 'connected' ? 'Завершить звонок' : 'На главную'}
                            </Typography>
                        </Button>
                    </div>
                </>
            )}

            {/* Окно результатов */}
            {showResults && (
                <div className={styles.resultsWrapper}>
                    <ResultsPage onBack={handleBackToOperator} />
                </div>
            )}
        </div>
    );
};

export default OperatorPage;
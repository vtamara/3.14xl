import { Datepicker } from '@/components';
import { DATE_INPUT_FORMAT } from '@/constants/common';
import styles from '@/pages/CreateEdition/styles.module.scss';

function ValidityPeriod() {
	return (
		<div className={styles.customFieldContainer}>
			<label className={styles.customFieldLabel}>
				Start & end time
				<span className={styles.inputCaptionOptional}>{' (Optional)'}</span>
			</label>
			<div className={styles.customFieldControlsValidityDate}>
				<Datepicker
					name="validity.start"
					inputFormat={DATE_INPUT_FORMAT}
					disablePast
					popperProps={{ placement: 'right' }}
					placeholder={'Now'}
				/>
				<Datepicker
					name="validity.end"
					inputFormat={DATE_INPUT_FORMAT}
					disablePast
					popperProps={{ placement: 'right' }}
					placeholder={'Forever'}
				/>
			</div>
		</div>
	);
}

export default ValidityPeriod;

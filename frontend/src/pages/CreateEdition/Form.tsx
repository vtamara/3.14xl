import { Formik } from 'formik';
import { useTonAddress, useTonConnectUI } from '@tonconnect/ui-react';
import styles from '@/pages/CreateEdition/styles.module.scss';
import FormArea from '@/pages/CreateEdition/FormArea';
import { formSchema } from '@/pages/CreateEdition/validation';
import { useCallback } from 'react';
import { FormValues } from '@/pages/CreateEdition/interfaces';
import EditionPreview from '@/pages/CreateEdition/Preview';
import { EDITIONS_SIZES } from '@/constants/common';
import { createEdition } from '../CreateEditionOld';
import { useMediaQuery } from 'react-responsive';
import EditionPreviewMobile from '@/pages/CreateEdition/PreviewMobile';

function CreateEditionForm() {
	const address = useTonAddress();
	const [tonConnectUI] = useTonConnectUI();

	const handleSubmit = useCallback(
		async (values: FormValues) => {
			if (!values.media) throw new Error('No media');

			await createEdition(tonConnectUI, {
				name: values.name,
				description: values.description,
				image: values.media,
				symbol: values.symbol,
				price: values.price,
				creatorAddress: address,
				maxSupply: values.editionSize.type === EDITIONS_SIZES.FIXED ? values.editionSize.amount : '0'
			});
		},
		[address, tonConnectUI]
	);

	const isTabletOrMobile = useMediaQuery({ query: '(max-width: 1224px)' });

	const createEditionInitialValues: FormValues = {
		name: 'Warrior',
		symbol: '$WRR',
		description: 'The warriors',
		media: null,
		price: '0.1',
		editionSize: {
			type: EDITIONS_SIZES.OPEN_EDITION,
			amount: '',
		},
		validity: {
			start: null,
			end: null,
		},
		payoutAddress: address
	};

	return (
		<Formik
			initialValues={createEditionInitialValues}
			validationSchema={formSchema}
			enableReinitialize
			onSubmit={handleSubmit}
		>
			<section className={styles.createEditionContainer}>
				<FormArea />
				{isTabletOrMobile ? <EditionPreviewMobile /> : <EditionPreview />}
			</section>
		</Formik>
	);
}

export default CreateEditionForm;

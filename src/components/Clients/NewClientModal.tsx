import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useLocation } from '../../contexts/LocationContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { toast, handleSupabaseError } from '../../lib/toast';
import PremiumModal, { PremiumInput, PremiumSelect, PremiumTextarea } from '../common/PremiumModal';

interface NewClientModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function NewClientModal({ onClose, onSuccess }: NewClientModalProps) {
  const { currentLocation } = useLocation();
  const { t } = useLanguage();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [trafficSource, setTrafficSource] = useState('direct');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!fullName.trim()) {
      toast.error('Name is required');
      return;
    }

    if (!phone.trim() || phone.length < 5) {
      toast.error('Valid phone number is required');
      return;
    }

    setLoading(true);
    const toastId = toast.loading('Creating customer...');

    try {
      const { error } = await supabase
        .from('clients')
        .insert({
          full_name: fullName.trim(),
          phone: phone.trim(),
          email: email.trim() || null,
          traffic_source: trafficSource,
          notes: notes.trim() || null,
          location_id: currentLocation?.id
        });

      if (error) {
        handleSupabaseError(error, 'Create customer');
        return;
      }

      toast.dismiss(toastId);
      toast.success('Customer created successfully!');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.dismiss(toastId);
      handleSupabaseError(err, 'Create customer');
    } finally {
      setLoading(false);
    }
  }

  return (
    <PremiumModal
      isOpen={true}
      onClose={onClose}
      title={t('clients.new')}
      subtitle="Добавить нового клиента в базу данных"
      maxWidth="md"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary"
          >
            {t('common.cancel')}
          </button>
          <button
            type="submit"
            form="new-client-form"
            disabled={loading}
            className="btn-primary disabled:opacity-50"
          >
            {loading ? t('clients.creating') : t('clients.createCustomer')}
          </button>
        </>
      }
    >
      <form id="new-client-form" onSubmit={handleSubmit} className="space-y-4">
        <PremiumInput
          label={t('clients.fullName')}
          required
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="John Doe"
          autoFocus
        />

        <PremiumInput
          label={t('clients.phone')}
          required
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+1234567890"
        />

        <PremiumInput
          label={t('clients.email')}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="customer@example.com"
        />

        <PremiumSelect
          label={t('clients.trafficSource')}
          value={trafficSource}
          onChange={(e) => setTrafficSource(e.target.value)}
        >
          <option value="direct">{t('source.direct')}</option>
          <option value="Instagram">{t('source.Instagram')}</option>
          <option value="Google">{t('source.Google')}</option>
          <option value="Yandex">{t('source.Yandex')}</option>
          <option value="Facebook">{t('source.Facebook')}</option>
          <option value="referral">{t('source.referral')}</option>
          <option value="other">{t('source.other')}</option>
        </PremiumSelect>

        <PremiumTextarea
          label={t('common.notes')}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t('common.notes')}
          rows={3}
        />
      </form>
    </PremiumModal>
  );
}

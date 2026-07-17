import AuthLayout from '@/components/AuthLayout';
import GradientButton from '@/components/GradientButton';

type NotFoundPageProps = {
  onGoHome: () => void;
};

export default function NotFoundPage({ onGoHome }: NotFoundPageProps) {
  return (
    <AuthLayout
      footer={null}
      subtitle="The page you are looking for does not exist."
      subtitleSize="sm"
      title="Page not found"
    >
      <GradientButton
        className="mt-[clamp(1.25rem,3.8dvh,2.25rem)] lg:mt-[36px]"
        onClick={onGoHome}
        type="button"
      >
        Go back
      </GradientButton>
    </AuthLayout>
  );
}

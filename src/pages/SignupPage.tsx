import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import { useAppDispatch } from '../store/hooks';
import { authStart, authSuccess, authFailure } from '../store/authSlice';
import { signUpWithEmail } from '../firebase/auth';
import { LoadingOverlay } from '../components/LoadingOverlay';

interface SignupFormData {
  email: string;
  password: string;
  displayName?: string;
}

/**
 * Signup page for new users
 */
export const SignupPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormData>();

  const onSubmit = async (data: SignupFormData) => {
    setIsLoading(true);
    dispatch(authStart());

    try {
      const user = await signUpWithEmail(
        data.email, 
        data.password, 
        data.displayName?.trim() || undefined
      );
      dispatch(authSuccess(user));
      toast.success('Account created successfully!');
      navigate('/canvas');
    } catch (error: any) {
      const errorMessage = error?.message || 'Signup failed. Please try again.';
      dispatch(authFailure(errorMessage));
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Simple email validation - flexible but must have @ and characters on both sides
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+$/;
    return emailRegex.test(email) || 'Please enter a valid email address';
  };

  return (
    <>
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Create your Collab Canvas account
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Join others in real-time collaboration
            </p>
          </div>
          
          <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email address *
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  className={`mt-1 appearance-none rounded-md relative block w-full px-3 py-2 border ${
                    errors.email ? 'border-red-300' : 'border-gray-300'
                  } placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm`}
                  placeholder="Enter your email"
                  {...register('email', {
                    required: 'Email is required',
                    validate: validateEmail
                  })}
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password *
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  className={`mt-1 appearance-none rounded-md relative block w-full px-3 py-2 border ${
                    errors.password ? 'border-red-300' : 'border-gray-300'
                  } placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm`}
                  placeholder="Enter your password"
                  {...register('password', {
                    required: 'Password is required'
                  })}
                />
                {errors.password && (
                  <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="displayName" className="block text-sm font-medium text-gray-700">
                  Display Name
                </label>
                <input
                  id="displayName"
                  type="text"
                  autoComplete="name"
                  className="mt-1 appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="Optional - will use your email if blank"
                  {...register('displayName')}
                />
                <p className="mt-1 text-xs text-gray-500">
                  Optional. If left blank, your email address will be used as your display name.
                </p>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Creating account...' : 'Create account'}
              </button>
            </div>
            
            <div className="text-center">
              <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
                Already have an account? Sign in
              </Link>
            </div>
          </form>
        </div>
      </div>

      <LoadingOverlay isVisible={isLoading} message="Creating account..." />
      <Toaster position="top-right" />
    </>
  );
};

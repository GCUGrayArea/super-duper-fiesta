import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import { useAppDispatch } from '../store/hooks';
import { authStart, authSuccess, authFailure } from '../store/authSlice';
import { signInWithEmail } from '../firebase/auth';
import { LoadingOverlay } from '../components/LoadingOverlay';

interface LoginFormData {
  email: string;
  password: string;
}

/**
 * Login page for existing users
 */
export const LoginPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>();

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    dispatch(authStart());

    try {
      const user = await signInWithEmail(data.email, data.password);
      dispatch(authSuccess(user));
      toast.success('Welcome back!');
      navigate('/canvas');
    } catch (error: any) {
      const errorMessage = error?.message || 'Login failed. Please try again.';
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
              Sign in to Collab Canvas
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Collaborate in real-time on a shared canvas
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
                  autoComplete="current-password"
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
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Signing in...' : 'Sign in'}
              </button>
            </div>
            
            <div className="text-center">
              <Link to="/signup" className="font-medium text-indigo-600 hover:text-indigo-500">
                Don't have an account? Sign up
              </Link>
            </div>
          </form>
        </div>
      </div>

      <LoadingOverlay isVisible={isLoading} message="Signing in..." />
      <Toaster position="top-right" />
    </>
  );
};

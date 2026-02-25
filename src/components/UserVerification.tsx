import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Camera, Shield, CheckCircle, Clock, Upload } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { getVerificationState, type VerificationStatus } from '@/lib/verification';
import { useToast } from '@/hooks/use-toast';

const VERIFICATION_MEDIA_BUCKET =
  import.meta.env.VITE_VERIFICATION_MEDIA_BUCKET || 'verification-media';
const MAX_VERIFICATION_FILE_BYTES = 10 * 1024 * 1024;

const sanitizeFileName = (name: string) => name.replace(/[^a-zA-Z0-9._-]/g, '_');

const UserVerification: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [photoStatus, setPhotoStatus] = useState<VerificationStatus>('pending');
  const [idStatus, setIdStatus] = useState<VerificationStatus>('pending');
  const [loading, setLoading] = useState(false);
  const [loadingState, setLoadingState] = useState(true);
  const [existingSafetySettings, setExistingSafetySettings] = useState<Record<string, any>>({});

  useEffect(() => {
    let cancelled = false;

    const loadState = async () => {
      if (!user?.id) {
        setLoadingState(false);
        return;
      }

      try {
        setLoadingState(true);
        const { data, error } = await supabase
          .from('profiles')
          .select('safety_settings')
          .eq('id', user.id)
          .maybeSingle();

        if (error) throw error;
        if (cancelled) return;

        const safety =
          data?.safety_settings && typeof data.safety_settings === 'object'
            ? (data.safety_settings as Record<string, any>)
            : {};

        const state = getVerificationState(safety);
        setExistingSafetySettings(safety);
        setPhotoStatus(state.photoStatus);
        setIdStatus(state.idStatus);
      } catch (error) {
        console.error('Failed to load verification state:', error);
        if (!cancelled) {
          setPhotoStatus('pending');
          setIdStatus('pending');
        }
      } finally {
        if (!cancelled) setLoadingState(false);
      }
    };

    void loadState();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const verificationState = useMemo(
    () =>
      getVerificationState({
        ...existingSafetySettings,
        verification_photo_status: photoStatus,
        verification_id_status: idStatus,
      }),
    [existingSafetySettings, photoStatus, idStatus]
  );

  const updateVerificationStatus = async (
    type: 'photo' | 'id',
    nextStatus: VerificationStatus,
    fileName?: string,
    storagePath?: string
  ) => {
    if (!user?.id) return;

    const now = new Date().toISOString();
    const nextSafety = {
      ...existingSafetySettings,
      verification_photo_status: type === 'photo' ? nextStatus : photoStatus,
      verification_id_status: type === 'id' ? nextStatus : idStatus,
      ...(type === 'photo'
        ? { verification_photo_file_name: fileName || existingSafetySettings.verification_photo_file_name }
        : { verification_id_file_name: fileName || existingSafetySettings.verification_id_file_name }),
      ...(type === 'photo'
        ? {
            verification_photo_storage_path:
              storagePath || existingSafetySettings.verification_photo_storage_path,
          }
        : {
            verification_id_storage_path:
              storagePath || existingSafetySettings.verification_id_storage_path,
          }),
      ...(type === 'photo'
        ? { verification_photo_updated_at: now }
        : { verification_id_updated_at: now }),
    };

    const computed = getVerificationState(nextSafety);
    nextSafety.verification_submitted_at =
      computed.submittedForReview && !existingSafetySettings.verification_submitted_at
        ? now
        : existingSafetySettings.verification_submitted_at;
    nextSafety.verification_under_review = computed.underReview;
    // Explicit approved flag should only be true after full approval workflow.
    nextSafety.photoVerification = computed.fullyApproved;

    const { data: updatedRow, error } = await supabase
      .from('profiles')
      .update({
        safety_settings: nextSafety,
        updated_at: now,
      })
      .eq('id', user.id)
      .select('id')
      .maybeSingle();

    if (error) throw error;
    if (!updatedRow) {
      throw new Error('Profile record not found. Please complete your profile first.');
    }

    setExistingSafetySettings(nextSafety);
    if (type === 'photo') setPhotoStatus(nextStatus);
    if (type === 'id') setIdStatus(nextStatus);
  };

  const pickSingleFile = (accept: string) =>
    new Promise<File | null>((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = accept;
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0] ?? null;
        resolve(file);
      };
      input.oncancel = () => resolve(null);
      input.click();
    });

  const uploadVerificationFile = async (type: 'photo' | 'id', file: File) => {
    if (!user?.id) throw new Error('You must be logged in.');

    if (file.size > MAX_VERIFICATION_FILE_BYTES) {
      throw new Error('File is too large. Max size is 10MB.');
    }

    if (type === 'photo' && !file.type.startsWith('image/')) {
      throw new Error('Verification photo must be an image.');
    }

    if (
      type === 'id' &&
      !file.type.startsWith('image/') &&
      file.type !== 'application/pdf'
    ) {
      throw new Error('ID must be an image or PDF.');
    }

    const safeName = sanitizeFileName(file.name);
    const uniquePart =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const path = `${user.id}/${type}/${uniquePart}-${safeName}`;

    const { error } = await supabase.storage
      .from(VERIFICATION_MEDIA_BUCKET)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      const message = (error.message || '').toLowerCase();
      if (message.includes('bucket not found')) {
        throw new Error(
          `Verification storage bucket "${VERIFICATION_MEDIA_BUCKET}" was not found. Run migration 20260225_add_verification_media_storage.sql.`
        );
      }
      if (message.includes('row-level security')) {
        throw new Error(
          `Verification upload blocked by storage policy for bucket "${VERIFICATION_MEDIA_BUCKET}".`
        );
      }
      throw error;
    }

    return { path, originalFileName: file.name };
  };

  const handlePhotoUpload = async () => {
    try {
      setLoading(true);
      const file = await pickSingleFile('image/*');
      if (!file) return;

      const uploaded = await uploadVerificationFile('photo', file);
      await updateVerificationStatus(
        'photo',
        'submitted',
        uploaded.originalFileName,
        uploaded.path
      );
      toast({
        title: 'Photo Submitted',
        description: 'Your verification photo is now under review.',
      });
    } catch (error) {
      console.error('Photo upload failed:', error);
      toast({
        title: 'Upload failed',
        description: (error as Error)?.message || 'Could not submit verification photo.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleIdUpload = async () => {
    try {
      setLoading(true);
      const file = await pickSingleFile('image/*,.pdf');
      if (!file) return;

      const uploaded = await uploadVerificationFile('id', file);
      await updateVerificationStatus('id', 'submitted', uploaded.originalFileName, uploaded.path);
      toast({
        title: 'ID Submitted',
        description: 'Your ID verification is now under review.',
      });
    } catch (error) {
      console.error('ID upload failed:', error);
      toast({
        title: 'Upload failed',
        description: (error as Error)?.message || 'Could not submit ID document.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const verificationSteps = [
    {
      id: 'photo',
      title: 'Photo Verification',
      completed: photoStatus === 'submitted' || photoStatus === 'approved',
    },
    {
      id: 'id',
      title: 'ID Verification',
      completed: idStatus === 'submitted' || idStatus === 'approved',
    },
    { id: 'review', title: 'Under Review', completed: verificationState.submittedForReview }
  ];

  const getStepBadge = (type: 'photo' | 'id') => {
    const status = type === 'photo' ? photoStatus : idStatus;
    if (status === 'approved') return <Badge variant="secondary" className="bg-green-100 text-green-700">Approved</Badge>;
    if (status === 'submitted') return <Badge variant="secondary" className="bg-purple-100 text-purple-700">Submitted</Badge>;
    if (status === 'rejected') return <Badge variant="secondary" className="bg-red-100 text-red-700">Rejected</Badge>;
    return null;
  };

  if (loadingState) {
    return (
      <div className="p-4 space-y-6 max-w-md mx-auto">
        <Card className="border-2 border-purple-200">
          <CardContent className="p-6 text-center text-gray-700">
            Checking verification status...
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6 max-w-md mx-auto">
      <Card className="border-2 border-purple-200">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full flex items-center justify-center mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-xl text-purple-800">🌈💜 Get Verified 💜🌈</CardTitle>
          <p className="text-sm text-gray-600">Build trust in the community</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {verificationSteps.map((step) => (
            <div key={step.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                {step.completed ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <Clock className="w-5 h-5 text-gray-400" />
                )}
                <span className={step.completed ? 'text-green-700' : 'text-gray-700'}>
                  {step.title}
                </span>
              </div>
              {step.id === 'photo'
                ? getStepBadge('photo')
                : step.id === 'id'
                ? getStepBadge('id')
                : step.completed
                ? <Badge variant="secondary" className="bg-purple-100 text-purple-700">In Review</Badge>
                : null}
            </div>
          ))}
          
          <div className="space-y-3 pt-4">
            <Button 
              onClick={handlePhotoUpload}
              className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600"
              disabled={photoStatus === 'submitted' || photoStatus === 'approved' || loading}
            >
              <Camera className="w-4 h-4 mr-2" />
              {photoStatus === 'approved'
                ? 'Photo Verified ✓'
                : photoStatus === 'submitted'
                ? 'Photo Submitted ✓'
                : 'Take Verification Photo'}
            </Button>
            
            <Button 
              onClick={handleIdUpload}
              variant="outline"
              className="w-full border-purple-300 text-purple-700 hover:bg-purple-50"
              disabled={idStatus === 'submitted' || idStatus === 'approved' || loading}
            >
              <Upload className="w-4 h-4 mr-2" />
              {idStatus === 'approved'
                ? 'ID Verified ✓'
                : idStatus === 'submitted'
                ? 'ID Submitted ✓'
                : 'Upload ID Document'}
            </Button>
          </div>

          {verificationState.submittedForReview && (
            <div className="mt-4 p-4 bg-purple-50 rounded-lg text-center">
              <p className="text-purple-700 font-medium">Verification Submitted!</p>
              <p className="text-sm text-purple-600 mt-1">Review typically takes 24-48 hours</p>
            </div>
          )}

          {verificationState.completeForAccess && (
            <Button
              className="w-full bg-green-600 hover:bg-green-700"
              onClick={() => {
                const params = new URLSearchParams(window.location.search);
                const redirect = params.get('redirect');
                const target = redirect && redirect.startsWith('/') ? redirect : '/social';
                navigate(target, { replace: true });
              }}
            >
              Continue
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default UserVerification;

import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '@/components/ui/Avatar';
import { useTheme } from '@/hooks/useTheme';
import { useActiveCircle } from '@/providers/ActiveCircleProvider';
import { useUpdateMemberProfile } from '@/hooks/useMembers';
import { uploadMemberAvatar } from '@/services/avatars';

interface EditableAvatarProps {
  memberId: string;
  name: string;
  uri?: string | null;
  size?: number;
  canEdit: boolean;
}

// An Avatar with a camera-badge overlay when `canEdit` is true — tapping it
// picks a photo from the library and uploads it to the `avatars` bucket,
// then writes the resulting URL onto this member's circle_members row.
// Used for both the current user's own photo and a guardian-managed
// child's — same member id, same mutation either way.
export function EditableAvatar({ memberId, name, uri, size = 80, canEdit }: EditableAvatarProps) {
  const { colors } = useTheme();
  const { circle } = useActiveCircle();
  const updateProfile = useUpdateMemberProfile(circle?.id ?? '');
  const [uploading, setUploading] = useState(false);

  const onPress = async () => {
    if (!canEdit || uploading) return;

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Photos indisponibles', "Autorise l'accès aux photos pour changer cette image.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
    });
    const asset = result.canceled ? null : result.assets[0];
    if (!asset) return;

    setUploading(true);
    try {
      const publicUrl = await uploadMemberAvatar(memberId, asset.uri);
      await updateProfile.mutateAsync({ memberId, fields: { avatar_url: publicUrl } });
    } catch {
      Alert.alert('Erreur', "La photo n'a pas pu être mise à jour.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Pressable onPress={onPress} disabled={!canEdit || uploading} style={{ width: size, height: size }}>
      <Avatar name={name} uri={uri} size={size} />
      {uploading ? (
        <View
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: size / 2,
            backgroundColor: 'rgba(0,0,0,0.45)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ActivityIndicator color="#fff" />
        </View>
      ) : null}
      {canEdit && !uploading ? (
        <View
          style={{
            position: 'absolute',
            right: -2,
            bottom: -2,
            width: Math.max(22, size * 0.32),
            height: Math.max(22, size * 0.32),
            borderRadius: 999,
            backgroundColor: colors.primary,
            borderWidth: 2,
            borderColor: colors.background,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="camera" size={Math.max(12, size * 0.16)} color={colors.textOnPrimary} />
        </View>
      ) : null}
    </Pressable>
  );
}


interface User {
  id: string;
  email: string;
  full_name: string;
  profile_pic_url?: string;
  theme_hue?: number;
}

export type { User };
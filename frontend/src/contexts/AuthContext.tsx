import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { userApi } from "@/api/user.api"; // Gọi file api chứa hàm getMe của bạn

interface User {
  id: string;
  email: string;
  full_name: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (data: any) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem("accessToken");
      const storedUser = localStorage.getItem("user");
      
      // Nếu không có token cơ bản, dọn dẹp và dừng lại
      if (!token || !storedUser) {
        setIsLoading(false);
        return;
      }

      try {
        // Tạm thời set data từ localStorage để UI không bị giật
        setUser(JSON.parse(storedUser));
        setIsAuthenticated(true);

        // Gọi API ngầm lên server để xác nhận token còn sống
        const freshUserData: any = await userApi.getMe();
        
        // Cập nhật thông tin mới nhất nếu cần
        setUser(freshUserData);
        localStorage.setItem("user", JSON.stringify(freshUserData));

      } catch (error) {
        // Nếu getMe() thất bại (bị 401), interceptor đã lo việc xóa localStorage.
        // Ở đây chỉ cần dọn dẹp state của React.
        console.error("Token expired or invalid on app load");
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = (data: any) => {
    localStorage.setItem("accessToken", data.tokens.access.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    
    setUser(data.user);
    setIsAuthenticated(true);
    navigate("/");
  };

  const logout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");
    
    setUser(null);
    setIsAuthenticated(false);
    navigate("/");
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
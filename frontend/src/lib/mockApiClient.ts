// Mock API client that replaces base44

import {
  mockCurrentUser,
  mockUsers,
  mockGroups,
  mockInvitations,
  mockMessages,
  mockCalendarEvents,
  mockTasks,
  mockNotes,
  mockTaskLists,
  mockSettings,
  mockTypingStatuses,
  mockPresences,
} from "./mockData";

interface FilterOptions {
  [key: string]: any;
}

// Simulate async delay
const delay = (ms: number = 300) =>
  new Promise((resolve) => setTimeout(resolve, ms));

class MockEntity {
  data: any[];
  
  constructor(data: any[]) {
    this.data = data;
  }

  async filter(options: FilterOptions) {
    await delay();
    return this.data.filter((item) => {
      return Object.keys(options).every((key) => item[key] === options[key]);
    });
  }

  async get(id: string) {
    await delay();
    return this.data.find((item) => item.id === id);
  }

  async list(sortBy?: string, limit?: number) {
    await delay();
    let result = [...this.data];
    
    // Handle sorting (e.g., "-created_date" means descending)
    if (sortBy) {
      const isDescending = sortBy.startsWith("-");
      const field = isDescending ? sortBy.substring(1) : sortBy;
      result.sort((a, b) => {
        const aVal = a[field];
        const bVal = b[field];
        if (aVal < bVal) return isDescending ? 1 : -1;
        if (aVal > bVal) return isDescending ? -1 : 1;
        return 0;
      });
    }
    
    if (limit) {
      result = result.slice(0, limit);
    }
    
    return result;
  }

  async create(data: any) {
    await delay();
    const newItem = {
      ...data,
      id: `${data.id || "item"}_${Date.now()}`,
      created_date: new Date().toISOString(),
      updated_date: new Date().toISOString(),
    };
    this.data.push(newItem);
    return newItem;
  }

  async update(id: string, data: any) {
    await delay();
    const index = this.data.findIndex((item) => item.id === id);
    if (index !== -1) {
      this.data[index] = {
        ...this.data[index],
        ...data,
        updated_date: new Date().toISOString(),
      };
      return this.data[index];
    }
    return null;
  }

  async delete(id: string) {
    await delay();
    const index = this.data.findIndex((item) => item.id === id);
    if (index !== -1) {
      const deleted = this.data[index];
      this.data.splice(index, 1);
      return deleted;
    }
    return null;
  }
}

// Main mock API client
export const mockApiClient = {
  auth: {
    me: async () => {
      await delay();
      return mockCurrentUser;
    },
    redirectToLogin: () => {
      // Mock redirect - in real scenario would navigate to login
      console.log("Redirecting to login...");
    },
    updateMe: async (data: any) => {
      await delay();
      Object.assign(mockCurrentUser, data);
      return mockCurrentUser;
    },
  },

  entities: {
    User: new MockEntity(mockUsers),
    Group: new MockEntity(mockGroups),
    Invitation: new MockEntity(mockInvitations),
    Message: new MockEntity(mockMessages),
    Event: new MockEntity(mockCalendarEvents),
    Task: new MockEntity(mockTasks),
    Note: new MockEntity(mockNotes),
    TaskList: new MockEntity(mockTaskLists),
    TypingStatus: new MockEntity(mockTypingStatuses),
    Presence: new MockEntity(mockPresences),
  },

  integrations: {
    Core: {
      UploadFile: async ({ file }: { file: File }) => {
        await delay(1000);
        // Mock file upload - return a fake URL
        return {
          file_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${file.name}`,
        };
      },
    },
  },
};

export type MockApiClient = typeof mockApiClient;

import { api } from "../lib/api";
import type {
  CategoryInput,
  MenuCategory,
  MenuItem,
  MenuItemInput,
  MenuResponse,
} from "../types/menu";
import type { PickedImage } from "../types/restaurant";


export const createMenuApi = (base: string) => ({
  getMenu: async () => {
    const { data } = await api.get<MenuResponse>(base);
    return data;
  },


  createCategory: async (input: CategoryInput) => {
    const { data } = await api.post<{ category: MenuCategory }>(`${base}/categories`, input);
    return data.category;
  },
  updateCategory: async (id: string, input: Partial<CategoryInput>) => {
    const { data } = await api.patch<{ category: MenuCategory }>(`${base}/categories/${id}`, input);
    return data.category;
  },
  deleteCategory: async (id: string) => {
    await api.delete(`${base}/categories/${id}`);
  },
  reorderCategories: async (ids: string[]) => {
    await api.put(`${base}/categories/order`, { ids });
  },


  getItem: async (id: string) => {
    const { data } = await api.get<{ item: MenuItem }>(`${base}/items/${id}`);
    return data.item;
  },
  createItem: async (input: MenuItemInput) => {
    const { data } = await api.post<{ item: MenuItem }>(`${base}/items`, input);
    return data.item;
  },
  updateItem: async (id: string, input: Partial<MenuItemInput>) => {
    const { data } = await api.patch<{ item: MenuItem }>(`${base}/items/${id}`, input);
    return data.item;
  },
  setItemAvailability: async (id: string, isAvailable: boolean) => {
    const { data } = await api.patch<{ item: MenuItem }>(`${base}/items/${id}/availability`, { isAvailable });
    return data.item;
  },
  deleteItem: async (id: string) => {
    await api.delete(`${base}/items/${id}`);
  },
  reorderItems: async (categoryId: string, ids: string[]) => {
    await api.put(`${base}/categories/${categoryId}/items/order`, { ids });
  },


  uploadItemImage: async (id: string, image: PickedImage) => {
    const type = image.mimeType ?? "image/jpeg";
    const extension = type.split("/")[1] ?? "jpg";
    const form = new FormData();
    form.append("image", {
      uri: image.uri,
      type,
      name: image.fileName ?? `item.${extension}`,
    } as unknown as Blob);

    const { data } = await api.patch<{ item: MenuItem }>(`${base}/items/${id}/image`, form, {
      headers: { "Content-Type": "multipart/form-data" },
      transformRequest: (body) => body,
      timeout: 60000,
    });
    return data.item;
  },
  removeItemImage: async (id: string) => {
    const { data } = await api.delete<{ item: MenuItem }>(`${base}/items/${id}/image`);
    return data.item;
  },
});

export type MenuApi = ReturnType<typeof createMenuApi>;

export const adminMenuApi = (restaurantId: string) => createMenuApi(`/admin/restaurants/${restaurantId}/menu`);
export const managerMenuApi = createMenuApi("/manager/menu");
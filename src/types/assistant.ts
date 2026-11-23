
export type AssistantCard =
  | {
      kind: "dish";
      itemId: string;
      restaurantId: string;
      name: string;
      restaurantName: string;
      price: number;
      image?: string;
      isOpenNow: boolean;
    }
  | {
      kind: "restaurant";
      restaurantId: string;
      name: string;
      logo?: string;
      cuisines: string[];
      isOpenNow: boolean;
      backAt?: string;
      ratingAvg?: number;
      distance?: string;
    }
  | {
      kind: "order";
      orderId: string;
      orderNumber: string;
      restaurantName: string;
      status: string;
      readyAt?: string;
    };

export type ChatTurn = { role: "user" | "assistant"; text: string };

export interface AssistantReply {
  reply: string;
  cards: AssistantCard[];
  remaining: number;
}
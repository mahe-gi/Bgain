export type AuthStackParamList = {
  Login: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Storage:
    | {
        targetFolder?: { id: string; name: string };
        resetToRoot?: boolean;
      }
    | undefined;
  Search: undefined;
  Users: undefined;
  Profile: undefined;
  FileDetails: { fileId: string };
};

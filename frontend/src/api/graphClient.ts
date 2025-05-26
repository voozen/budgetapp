import axios, { AxiosError } from "axios";

interface GraphQLError {
  message: string;
  extensions?: {
    code?: string;
    classification?: string;
  };
}

interface GraphQLResponse {
  data?: any;
  errors?: GraphQLError[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const graphqlClient = async (query: string, variables?: any) => {
  const token = localStorage.getItem("accessToken");

  try {
    const response = await axios.post<GraphQLResponse>(
      "http://localhost:8080/graphql",
      {
        query,
        variables,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
      }
    );

    // Handle GraphQL errors
    if (response.data.errors && response.data.errors.length > 0) {
      const errorMessages = response.data.errors.map((error: GraphQLError) => {
        // Check for specific error types
        if (error.extensions?.code === 'UNAUTHENTICATED') {
          // Clear invalid token
          localStorage.removeItem("accessToken");
          return "Sesja wygasła. Zaloguj się ponownie.";
        }
        if (error.extensions?.code === 'FORBIDDEN') {
          return "Brak uprawnień do wykonania tej operacji.";
        }
        return error.message;
      });
      
      throw new Error(errorMessages.join("\n"));
    }

    return response.data;
  } catch (err) {
    // Handle different types of errors
    if (err instanceof AxiosError) {
      // Network or HTTP errors
      if (err.response) {
        // Server responded with error status
        const status = err.response.status;
        switch (status) {
          case 401:
            localStorage.removeItem("accessToken");
            throw new Error("Nieautoryzowany dostęp. Zaloguj się ponownie.");
          case 403:
            throw new Error("Brak uprawnień do wykonania tej operacji.");
          case 404:
            throw new Error("Zasób nie został znaleziony.");
          case 500:
            throw new Error("Błąd serwera. Spróbuj ponownie później.");
          default:
            throw new Error(`Błąd serwera: ${status}`);
        }
      } else if (err.request) {
        // Network error
        throw new Error("Błąd połączenia z serwerem. Sprawdź połączenie internetowe.");
      } else {
        // Request setup error
        throw new Error("Błąd konfiguracji żądania.");
      }
    }
    
    // Re-throw if it's already a custom error (like GraphQL errors)
    if (err instanceof Error) {
      throw err;
    }
    
    // Fallback for unknown errors
    throw new Error("Wystąpił nieoczekiwany błąd.");
  }
};

export default graphqlClient;

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

// Helper function to clear authentication token
const clearAuthToken = (): void => {
  localStorage.removeItem("accessToken");
};

// Helper function to handle GraphQL-specific errors
const handleGraphQLError = (error: GraphQLError): string => {
  if (error.extensions?.code === 'UNAUTHENTICATED') {
    clearAuthToken();
    return "Sesja wygasła. Zaloguj się ponownie.";
  }
  
  if (error.extensions?.code === 'FORBIDDEN') {
    return "Brak uprawnień do wykonania tej operacji.";
  }
  
  return error.message;
};

// Helper function to process GraphQL errors
const processGraphQLErrors = (errors: GraphQLError[]): never => {
  const errorMessages = errors.map(handleGraphQLError);
  throw new Error(errorMessages.join("\n"));
};

// Helper function to handle HTTP status errors
const handleHttpStatusError = (status: number): never => {
  const statusErrorMap: Record<number, string> = {
    401: "Nieautoryzowany dostęp. Zaloguj się ponownie.",
    403: "Brak uprawnień do wykonania tej operacji.",
    404: "Zasób nie został znaleziony.",
    500: "Błąd serwera. Spróbuj ponownie później.",
  };

  if (status === 401) {
    clearAuthToken();
  }

  const errorMessage = statusErrorMap[status] ?? `Błąd serwera: ${status}`;
  throw new Error(errorMessage);
};

// Helper function to handle Axios errors
const handleAxiosError = (error: AxiosError): never => {
  if (error.response) {
    // Server responded with error status
    return handleHttpStatusError(error.response.status);
  }
  
  if (error.request) {
    // Network error
    throw new Error("Błąd połączenia z serwerem. Sprawdź połączenie internetowe.");
  }
  
  // Request setup error
  throw new Error("Błąd konfiguracji żądania.");
};

// Helper function to handle any error type
const handleError = (err: unknown): never => {
  if (err instanceof AxiosError) {
    return handleAxiosError(err);
  }
  
  if (err instanceof Error) {
    throw err;
  }
  
  throw new Error("Wystąpił nieoczekiwany błąd.");
};

// Main GraphQL client function
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const graphqlClient = async (query: string, variables?: any) => {
  const token = localStorage.getItem("accessToken");

  try {
    const response = await axios.post<GraphQLResponse>(
      "http://localhost:8080/graphql",
      { query, variables },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
      }
    );

    // Check for GraphQL errors
    if (response.data.errors?.length) {
      processGraphQLErrors(response.data.errors);
    }

    return response.data;
  } catch (err) {
    handleError(err);
  }
};

export default graphqlClient;

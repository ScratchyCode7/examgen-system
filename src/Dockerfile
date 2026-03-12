# Use .NET 9 SDK for building
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# Copy csproj and restore dependencies
COPY ["src.csproj", "./"]
RUN dotnet restore "src.csproj"

# Copy everything else and build
COPY . .
RUN dotnet publish "src.csproj" -c Release -o /app/publish

# Use .NET 9 runtime for running
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS runtime
WORKDIR /app

# Copy published files
COPY --from=build /app/publish .

# Create directory for uploaded images
RUN mkdir -p wwwroot/uploads/questions

# Expose port 10000 (Render's default)
EXPOSE 10000

# Set environment variable for URLs
ENV ASPNETCORE_URLS=http://0.0.0.0:10000

# Run the application
ENTRYPOINT ["dotnet", "src.dll"]

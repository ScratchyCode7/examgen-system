using System.Reflection;
using Databank.Abstract;

namespace Databank.Extensions;

/// <summary>
/// Provides extension methods for registering and mapping modular endpoints in the application.
/// </summary>
public static class EndpointExtensions
{
    /// <summary>
    /// Registers all non-abstract implementations of <see cref="IEndpoint"/> found in the specified assembly.
    /// Each endpoint is registered as a scoped service for dependency resolution.
    /// </summary>
    /// <param name="services">The service collection to register endpoints into.</param>
    /// <param name="assembly">The assembly to scan for endpoint implementations.</param>
    /// <returns>The updated service collection.</returns>
    public static IServiceCollection AddEndpoints(this IServiceCollection services, Assembly assembly)
    {
        var types = assembly.DefinedTypes
            .Where(t => typeof(IEndpoint).IsAssignableFrom(t) && !t.IsAbstract && !t.IsInterface);

        foreach (var type in types)
        {
            services.AddScoped(typeof(IEndpoint), type); // Scoped because they depend on AppDbContext
        }

        return services;
    }

    /// <summary>
    /// Maps all registered <see cref="IEndpoint"/> instances to the application's endpoint route builder.
    /// Uses a temporary scope to resolve endpoints at startup without affecting their runtime lifetimes.
    /// </summary>
    /// <param name="app">The WebApplication instance to configure.</param>
    /// <returns>The configured WebApplication.</returns>
    public static WebApplication Endpoint(this WebApplication app, RouteGroupBuilder? routeGroupBuilder = null)
    {
        var routeBuilder = (IEndpointRouteBuilder)app;

        using var scope = app.Services.CreateScope();
        var endpoints = scope.ServiceProvider.GetServices<IEndpoint>();
        IEndpointRouteBuilder builder = routeGroupBuilder is null ? app : routeGroupBuilder;


        foreach (IEndpoint endpoint in endpoints)
        {
            endpoint.Endpoint(routeBuilder);
        }

        return app;
    }

    /// <summary>
    /// Applies a permission-based authorization policy to the route handler.
    /// </summary>
    /// <param name="app">The route handler builder to configure.</param>
    /// <param name="permission">The name of the required permission.</param>
    /// <returns>The updated route handler builder.</returns>
    public static RouteHandlerBuilder HasPermission(this RouteHandlerBuilder app, string permission)
    {
        return app.RequireAuthorization(permission);
    }
}
